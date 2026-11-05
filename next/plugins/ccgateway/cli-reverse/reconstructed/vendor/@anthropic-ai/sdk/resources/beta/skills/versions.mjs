/**
 * @anthropic-ai/sdk/resources/beta/skills/versions.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { withUploadBody } from "../../../internal/uploads.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:135916-137358 esm-fingerprint
class Versions_2 extends APIResource {
  create(skillID, params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post(
      parseUrl_2`/v1/skills/${skillID}/versions?beta=true`,
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
  retrieve(version, params, options) {
    let { skill_id, betas, workspace_id } = params;
    return this._client.get(parseUrl_2`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
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
  list(skillID, params = {}, options) {
    let { betas, workspace_id, ...query } = params ?? {};
    return this._client.getAPIList(parseUrl_2`/v1/skills/${skillID}/versions?beta=true`, TokenPage, {
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
  delete(version, params, options) {
    let { skill_id, betas, workspace_id } = params;
    return this._client.delete(parseUrl_2`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
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
  download(version, params, options) {
    let { skill_id, betas, workspace_id } = params;
    return this._client.get(parseUrl_2`/v1/skills/${skill_id}/versions/${version}/content?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          Accept: "application/binary",
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
      __binaryResponse: true,
    });
  }
}
export { Versions_2 };
